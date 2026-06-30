"""
Cognee Cloud quickstart — runs on Cognee's servers using your Cloud credits.
IMPORTANT: load_dotenv() must run BEFORE importing cogwit_sdk, because the SDK
reads COGWIT_API_BASE at import time.
"""
import asyncio
import os

from dotenv import load_dotenv
load_dotenv()  # must come before the cogwit_sdk import below

from cogwit_sdk import cogwit, CogwitConfig

cogwit_instance = cogwit(CogwitConfig(api_key=os.getenv("COGWIT_API_KEY", "")))


async def main():
    add_result = await cogwit_instance.add(
        data="Cognee Cloud automates knowledge graph creation in the cloud.",
        dataset_name="demo_dataset",
    )
    print("Add status:", add_result.status)
    dataset_id = add_result.dataset_id

    cognify_result = await cogwit_instance.cognify(dataset_ids=[dataset_id])
    print("Cognify status:", cognify_result[str(dataset_id)].status)

    results = await cogwit_instance.search(
        query_text="What does Cognee Cloud automate?",
        query_type=cogwit_instance.SearchType.GRAPH_COMPLETION,
    )
    for r in results:
        print("Answer:", r.search_result)


if __name__ == "__main__":
    asyncio.run(main())